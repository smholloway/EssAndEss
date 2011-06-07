//
//  Helpers.h
//  TechPrep
//
//  Created by Shayne Czyzewski on 6/6/11.
//  Copyright 2011 University of Texas at Austin. All rights reserved.
//

#import <Foundation/Foundation.h>


@interface Helpers : NSObject {

}

+ (NSString*)getExtraParams;
+ (NSString*)md5HexDigest:(NSString*)input;

@end
